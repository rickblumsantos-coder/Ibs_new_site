from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ===== MODELS =====

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str

class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: Optional[EmailStr] = None
    cpf: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    cpf: Optional[str] = None
    address: Optional[str] = None

class Vehicle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    license_plate: str
    model: str
    brand: str
    year: int
    color: Optional[str] = None
    transmission: Optional[str] = None  # Manual, Automático, CVT, etc.
    fuel_type: Optional[str] = None     # Gasolina, Etanol, Flex, Diesel, Elétrico, Híbrido
    mileage: Optional[int] = None       # Quilometragem
    engine: Optional[str] = None        # Motor (1.0, 1.6, 2.0, etc.)
    notes: Optional[str] = None         # Observações adicionais
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VehicleCreate(BaseModel):
    client_id: str
    license_plate: str
    model: str
    brand: str
    year: int
    color: Optional[str] = None
    transmission: Optional[str] = None
    fuel_type: Optional[str] = None
    mileage: Optional[int] = None
    engine: Optional[str] = None
    notes: Optional[str] = None

class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    default_price: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_price: float

class Part(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    price: float
    stock: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int = 0

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    vehicle_id: str
    appointment_date: datetime
    status: Literal["scheduled", "confirmed", "completed", "cancelled"] = "scheduled"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentCreate(BaseModel):
    client_id: str
    vehicle_id: str
    appointment_date: datetime
    status: Literal["scheduled", "confirmed", "completed", "cancelled"] = "scheduled"
    notes: Optional[str] = None

class QuoteItem(BaseModel):
    type: Literal["service", "part"]
    item_id: str
    name: str
    quantity: int
    unit_price: float
    total: float

class Quote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    vehicle_id: str
    items: List[QuoteItem]
    subtotal: float
    discount: float = 0
    labor_cost: float = 0
    total: float
    status: Literal["pending", "approved", "rejected", "completed"] = "pending"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved_at: Optional[datetime] = None

class QuoteCreate(BaseModel):
    client_id: str
    vehicle_id: str
    items: List[QuoteItem]
    discount: float = 0
    labor_cost: float = 0
    notes: Optional[str] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    workshop_name: str = "IBS Auto Center"
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    email_api_key: Optional[str] = None
    address: Optional[str] = None

class SettingsUpdate(BaseModel):
    workshop_name: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    email_api_key: Optional[str] = None
    address: Optional[str] = None

class DashboardStats(BaseModel):
    total_clients: int
    total_vehicles: int
    pending_appointments: int
    pending_quotes: int
    monthly_revenue: float
    recent_appointments: List[dict]

# ===== AUTH HELPERS =====

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def init_admin():
    admin = await db.admins.find_one({"username": "ibs"}, {"_id": 0})
    if not admin:
        hashed_password = bcrypt.hashpw("ibs1234".encode('utf-8'), bcrypt.gensalt())
        await db.admins.insert_one({
            "id": str(uuid.uuid4()),
            "username": "ibs",
            "password": hashed_password.decode('utf-8'),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Admin user created: ibs / ibs1234")

# ===== AUTH ROUTES =====

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    admin = await db.admins.find_one({"username": request.username}, {"_id": 0})
    
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(request.password.encode('utf-8'), admin["password"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {"sub": admin["username"], "exp": expires}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return LoginResponse(token=token, username=admin["username"])

# ===== CLIENT ROUTES =====

@api_router.get("/clients", response_model=List[Client])
async def get_clients(username: str = Depends(verify_token)):
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    for client in clients:
        if isinstance(client.get('created_at'), str):
            client['created_at'] = datetime.fromisoformat(client['created_at'])
    return clients

@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, username: str = Depends(verify_token)):
    client = Client(**client_data.model_dump())
    doc = client.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.clients.insert_one(doc)
    return client

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client_data: ClientCreate, username: str = Depends(verify_token)):
    result = await db.clients.update_one({"id": client_id}, {"$set": client_data.model_dump(exclude_none=True)})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Client(**updated)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, username: str = Depends(verify_token)):
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}

# ===== VEHICLE ROUTES =====

@api_router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(username: str = Depends(verify_token)):
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(1000)
    for vehicle in vehicles:
        if isinstance(vehicle.get('created_at'), str):
            vehicle['created_at'] = datetime.fromisoformat(vehicle['created_at'])
    return vehicles

@api_router.get("/vehicles/by-client/{client_id}", response_model=List[Vehicle])
async def get_vehicles_by_client(client_id: str, username: str = Depends(verify_token)):
    vehicles = await db.vehicles.find({"client_id": client_id}, {"_id": 0}).to_list(1000)
    for vehicle in vehicles:
        if isinstance(vehicle.get('created_at'), str):
            vehicle['created_at'] = datetime.fromisoformat(vehicle['created_at'])
    return vehicles

@api_router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, username: str = Depends(verify_token)):
    vehicle = Vehicle(**vehicle_data.model_dump())
    doc = vehicle.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.vehicles.insert_one(doc)
    return vehicle

@api_router.put("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleCreate, username: str = Depends(verify_token)):
    result = await db.vehicles.update_one({"id": vehicle_id}, {"$set": vehicle_data.model_dump(exclude_none=True)})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    updated = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Vehicle(**updated)

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, username: str = Depends(verify_token)):
    result = await db.vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted successfully"}

# ===== SERVICE ROUTES =====

@api_router.get("/services", response_model=List[Service])
async def get_services(username: str = Depends(verify_token)):
    services = await db.services.find({}, {"_id": 0}).to_list(1000)
    for service in services:
        if isinstance(service.get('created_at'), str):
            service['created_at'] = datetime.fromisoformat(service['created_at'])
    return services

@api_router.post("/services", response_model=Service)
async def create_service(service_data: ServiceCreate, username: str = Depends(verify_token)):
    service = Service(**service_data.model_dump())
    doc = service.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.services.insert_one(doc)
    return service

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: str, service_data: ServiceCreate, username: str = Depends(verify_token)):
    result = await db.services.update_one({"id": service_id}, {"$set": service_data.model_dump(exclude_none=True)})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    updated = await db.services.find_one({"id": service_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Service(**updated)

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, username: str = Depends(verify_token)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted successfully"}

# ===== PART ROUTES =====

@api_router.get("/parts", response_model=List[Part])
async def get_parts(username: str = Depends(verify_token)):
    parts = await db.parts.find({}, {"_id": 0}).to_list(1000)
    for part in parts:
        if isinstance(part.get('created_at'), str):
            part['created_at'] = datetime.fromisoformat(part['created_at'])
    return parts

@api_router.post("/parts", response_model=Part)
async def create_part(part_data: PartCreate, username: str = Depends(verify_token)):
    part = Part(**part_data.model_dump())
    doc = part.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.parts.insert_one(doc)
    return part

@api_router.put("/parts/{part_id}", response_model=Part)
async def update_part(part_id: str, part_data: PartCreate, username: str = Depends(verify_token)):
    result = await db.parts.update_one({"id": part_id}, {"$set": part_data.model_dump(exclude_none=True)})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Part not found")
    updated = await db.parts.find_one({"id": part_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Part(**updated)

@api_router.delete("/parts/{part_id}")
async def delete_part(part_id: str, username: str = Depends(verify_token)):
    result = await db.parts.delete_one({"id": part_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Part not found")
    return {"message": "Part deleted successfully"}

# ===== APPOINTMENT ROUTES =====

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(username: str = Depends(verify_token)):
    appointments = await db.appointments.find({}, {"_id": 0}).to_list(1000)
    for appointment in appointments:
        if isinstance(appointment.get('created_at'), str):
            appointment['created_at'] = datetime.fromisoformat(appointment['created_at'])
        if isinstance(appointment.get('appointment_date'), str):
            appointment['appointment_date'] = datetime.fromisoformat(appointment['appointment_date'])
    return appointments

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appointment_data: AppointmentCreate, username: str = Depends(verify_token)):
    appointment = Appointment(**appointment_data.model_dump())
    doc = appointment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['appointment_date'] = doc['appointment_date'].isoformat()
    await db.appointments.insert_one(doc)
    return appointment

@api_router.put("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, appointment_data: AppointmentCreate, username: str = Depends(verify_token)):
    update_data = appointment_data.model_dump(exclude_none=True)
    if 'appointment_date' in update_data and isinstance(update_data['appointment_date'], datetime):
        update_data['appointment_date'] = update_data['appointment_date'].isoformat()
    
    result = await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    updated = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated['appointment_date'], str):
        updated['appointment_date'] = datetime.fromisoformat(updated['appointment_date'])
    return Appointment(**updated)

@api_router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, username: str = Depends(verify_token)):
    result = await db.appointments.delete_one({"id": appointment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment deleted successfully"}

# ===== QUOTE ROUTES =====

@api_router.get("/quotes", response_model=List[Quote])
async def get_quotes(username: str = Depends(verify_token)):
    quotes = await db.quotes.find({}, {"_id": 0}).to_list(1000)
    for quote in quotes:
        if isinstance(quote.get('created_at'), str):
            quote['created_at'] = datetime.fromisoformat(quote['created_at'])
        if quote.get('approved_at') and isinstance(quote['approved_at'], str):
            quote['approved_at'] = datetime.fromisoformat(quote['approved_at'])
    return quotes

@api_router.post("/quotes", response_model=Quote)
async def create_quote(quote_data: QuoteCreate, username: str = Depends(verify_token)):
    subtotal = sum(item.total for item in quote_data.items)
    total = subtotal + quote_data.labor_cost - quote_data.discount
    
    quote = Quote(
        **quote_data.model_dump(),
        subtotal=subtotal,
        total=total
    )
    doc = quote.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('approved_at'):
        doc['approved_at'] = doc['approved_at'].isoformat()
    await db.quotes.insert_one(doc)
    return quote

@api_router.put("/quotes/{quote_id}", response_model=Quote)
async def update_quote(quote_id: str, quote_data: QuoteCreate, username: str = Depends(verify_token)):
    subtotal = sum(item.total for item in quote_data.items)
    total = subtotal + quote_data.labor_cost - quote_data.discount
    
    update_data = quote_data.model_dump()
    update_data['subtotal'] = subtotal
    update_data['total'] = total
    
    result = await db.quotes.update_one({"id": quote_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    updated = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if updated.get('approved_at') and isinstance(updated['approved_at'], str):
        updated['approved_at'] = datetime.fromisoformat(updated['approved_at'])
    return Quote(**updated)

@api_router.post("/quotes/{quote_id}/approve")
async def approve_quote(quote_id: str, username: str = Depends(verify_token)):
    result = await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote approved successfully"}

@api_router.post("/quotes/{quote_id}/reject")
async def reject_quote(quote_id: str, username: str = Depends(verify_token)):
    result = await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "rejected"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote rejected successfully"}

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, username: str = Depends(verify_token)):
    result = await db.quotes.delete_one({"id": quote_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote deleted successfully"}

@api_router.get("/quotes/{quote_id}/pdf")
async def generate_quote_pdf(quote_id: str, username: str = Depends(verify_token)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    client = await db.clients.find_one({"id": quote['client_id']}, {"_id": 0})
    vehicle = await db.vehicles.find_one({"id": quote['vehicle_id']}, {"_id": 0})
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    
    if not settings:
        settings = {"workshop_name": "IBS Auto Center"}
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#DC2626'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    story.append(Paragraph(settings['workshop_name'], title_style))
    story.append(Spacer(1, 0.3*inch))
    
    story.append(Paragraph(f"<b>Orçamento #{quote['id'][:8]}</b>", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    info_data = [
        ['Cliente:', client['name'] if client else 'N/A'],
        ['Veículo:', f"{vehicle['brand']} {vehicle['model']} - {vehicle['license_plate']}" if vehicle else 'N/A'],
        ['Data:', datetime.fromisoformat(quote['created_at']).strftime('%d/%m/%Y %H:%M') if isinstance(quote['created_at'], str) else quote['created_at'].strftime('%d/%m/%Y %H:%M')],
        ['Status:', quote['status'].upper()]
    ]
    
    info_table = Table(info_data, colWidths=[1.5*inch, 4.5*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#18181b')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#27272a'))
    ]))
    
    story.append(info_table)
    story.append(Spacer(1, 0.3*inch))
    
    story.append(Paragraph("<b>Itens do Orçamento</b>", styles['Heading3']))
    story.append(Spacer(1, 0.1*inch))
    
    items_data = [['Tipo', 'Item', 'Qtd', 'Preço Unit.', 'Total']]
    for item in quote['items']:
        items_data.append([
            item['type'].upper(),
            item['name'],
            str(item['quantity']),
            f"R$ {item['unit_price']:.2f}",
            f"R$ {item['total']:.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[1*inch, 2.5*inch, 0.7*inch, 1.2*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DC2626')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#27272a')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
    ]))
    
    story.append(items_table)
    story.append(Spacer(1, 0.3*inch))
    
    totals_data = [
        ['Subtotal:', f"R$ {quote['subtotal']:.2f}"],
    ]
    
    if quote.get('labor_cost', 0) > 0:
        totals_data.append(['Mão de Obra:', f"R$ {quote['labor_cost']:.2f}"])
    
    totals_data.append(['Desconto:', f"R$ {quote['discount']:.2f}"])
    totals_data.append(['TOTAL:', f"R$ {quote['total']:.2f}"])
    
    totals_table = Table(totals_data, colWidths=[4.8*inch, 1.8*inch])
    last_row = len(totals_data) - 1
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, last_row), (-1, last_row), 'Helvetica-Bold'),
        ('FONTSIZE', (0, last_row), (-1, last_row), 14),
        ('TEXTCOLOR', (0, last_row), (-1, last_row), colors.HexColor('#DC2626')),
        ('LINEABOVE', (0, last_row), (-1, last_row), 2, colors.HexColor('#DC2626')),
        ('TOPPADDING', (0, last_row), (-1, last_row), 12)
    ]))
    
    story.append(totals_table)
    
    if quote.get('notes'):
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("<b>Observações:</b>", styles['Heading3']))
        story.append(Paragraph(quote['notes'], styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=orcamento_{quote_id[:8]}.pdf"}
    )

# ===== SETTINGS ROUTES =====

@api_router.get("/settings", response_model=Settings)
async def get_settings(username: str = Depends(verify_token)):
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings:
        settings = Settings().model_dump()
        await db.settings.insert_one(settings)
    return Settings(**settings)

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings_data: SettingsUpdate, username: str = Depends(verify_token)):
    await db.settings.update_one(
        {"id": "settings"},
        {"$set": settings_data.model_dump(exclude_none=True)},
        upsert=True
    )
    updated = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    return Settings(**updated)

# ===== DASHBOARD ROUTES =====

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(username: str = Depends(verify_token)):
    total_clients = await db.clients.count_documents({})
    total_vehicles = await db.vehicles.count_documents({})
    pending_appointments = await db.appointments.count_documents({"status": {"$in": ["scheduled", "confirmed"]}})
    pending_quotes = await db.quotes.count_documents({"status": "pending"})
    
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    approved_quotes = await db.quotes.find({
        "status": {"$in": ["approved", "completed"]},
        "created_at": {"$gte": start_of_month.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    monthly_revenue = sum(quote['total'] for quote in approved_quotes)
    
    recent_appointments_raw = await db.appointments.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    recent_appointments = []
    for apt in recent_appointments_raw:
        client = await db.clients.find_one({"id": apt['client_id']}, {"_id": 0})
        vehicle = await db.vehicles.find_one({"id": apt['vehicle_id']}, {"_id": 0})
        recent_appointments.append({
            "id": apt['id'],
            "client_name": client['name'] if client else 'N/A',
            "vehicle": f"{vehicle['brand']} {vehicle['model']}" if vehicle else 'N/A',
            "date": apt['appointment_date'],
            "status": apt['status']
        })
    
    return DashboardStats(
        total_clients=total_clients,
        total_vehicles=total_vehicles,
        pending_appointments=pending_appointments,
        pending_quotes=pending_quotes,
        monthly_revenue=monthly_revenue,
        recent_appointments=recent_appointments
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_admin()
    logger.info("IBS Auto Center API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()