import requests
import sys
from datetime import datetime
import json

class IBSAutoTester:
    def __init__(self, base_url="https://manutencao-oficina.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_data = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token and auth_required:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:200]}")

            response_data = {}
            try:
                response_data = response.json() if response.text else {}
            except:
                pass

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login with IBS credentials"""
        success, response = self.run_test(
            "Login with IBS credentials",
            "POST", 
            "auth/login",
            200,
            data={"username": "ibs", "password": "ibs1234"},
            auth_required=False
        )
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_client_crud(self):
        """Test client CRUD operations"""
        # Create client
        client_data = {
            "name": "João Silva", 
            "phone": "11999887766",
            "email": "joao@email.com",
            "cpf": "12345678901"
        }
        success, response = self.run_test("Create Client", "POST", "clients", 200, client_data)
        if success and 'id' in response:
            client_id = response['id']
            self.created_data['client_id'] = client_id
            
            # Get clients
            self.run_test("Get Clients", "GET", "clients", 200)
            
            # Update client
            update_data = {"name": "João Silva Atualizado", "phone": "11999887766"}
            self.run_test("Update Client", "PUT", f"clients/{client_id}", 200, update_data)
            
            return True
        return False

    def test_vehicle_crud(self):
        """Test vehicle CRUD operations"""
        if 'client_id' not in self.created_data:
            print("❌ Skipping vehicle tests - no client created")
            return False
            
        vehicle_data = {
            "client_id": self.created_data['client_id'],
            "license_plate": "ABC1234",
            "model": "Civic",
            "brand": "Honda", 
            "year": 2020,
            "color": "Preto"
        }
        success, response = self.run_test("Create Vehicle", "POST", "vehicles", 200, vehicle_data)
        if success and 'id' in response:
            vehicle_id = response['id']
            self.created_data['vehicle_id'] = vehicle_id
            
            self.run_test("Get Vehicles", "GET", "vehicles", 200)
            
            # Get vehicles by client
            self.run_test("Get Vehicles by Client", "GET", f"vehicles/by-client/{self.created_data['client_id']}", 200)
            
            return True
        return False

    def test_service_crud(self):
        """Test service CRUD operations"""
        service_data = {
            "name": "Troca de Óleo",
            "description": "Troca de óleo do motor",
            "default_price": 80.0
        }
        success, response = self.run_test("Create Service", "POST", "services", 200, service_data)
        if success and 'id' in response:
            service_id = response['id']
            self.created_data['service_id'] = service_id
            
            self.run_test("Get Services", "GET", "services", 200)
            return True
        return False

    def test_part_crud(self):
        """Test part CRUD operations"""  
        part_data = {
            "name": "Filtro de Óleo",
            "description": "Filtro de óleo do motor",
            "price": 25.0,
            "stock": 10
        }
        success, response = self.run_test("Create Part", "POST", "parts", 200, part_data)
        if success and 'id' in response:
            part_id = response['id']
            self.created_data['part_id'] = part_id
            
            self.run_test("Get Parts", "GET", "parts", 200)
            return True
        return False

    def test_quote_crud(self):
        """Test quote operations including labor cost"""
        if 'client_id' not in self.created_data or 'vehicle_id' not in self.created_data:
            print("❌ Skipping quote tests - missing dependencies") 
            return False
        
        # Create quote with labor cost
        quote_data = {
            "client_id": self.created_data['client_id'],
            "vehicle_id": self.created_data['vehicle_id'],
            "items": [
                {
                    "type": "service",
                    "item_id": self.created_data.get('service_id', 'dummy'),
                    "name": "Troca de Óleo", 
                    "quantity": 1,
                    "unit_price": 80.0,
                    "total": 80.0
                }
            ],
            "discount": 0,
            "labor_cost": 50.0,
            "notes": "Orçamento teste"
        }
        success, response = self.run_test("Create Quote with Labor Cost", "POST", "quotes", 200, quote_data)
        if success and 'id' in response:
            quote_id = response['id']
            self.created_data['quote_id'] = quote_id
            
            self.run_test("Get Quotes", "GET", "quotes", 200)
            
            # Test approve/reject quote
            self.run_test("Approve Quote", "POST", f"quotes/{quote_id}/approve", 200)
            self.run_test("Reject Quote", "POST", f"quotes/{quote_id}/reject", 200)
            
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        return self.run_test("Get Dashboard Stats", "GET", "dashboard/stats", 200)[0]

    def test_settings(self):
        """Test settings operations"""
        success, response = self.run_test("Get Settings", "GET", "settings", 200)
        if success:
            # Update settings
            settings_data = {"workshop_name": "IBS Auto Center - Teste"}
            self.run_test("Update Settings", "PUT", "settings", 200, settings_data)
        return success

    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete in reverse order due to dependencies
        if 'quote_id' in self.created_data:
            self.run_test("Delete Quote", "DELETE", f"quotes/{self.created_data['quote_id']}", 200)
        if 'service_id' in self.created_data:
            self.run_test("Delete Service", "DELETE", f"services/{self.created_data['service_id']}", 200)
        if 'part_id' in self.created_data:
            self.run_test("Delete Part", "DELETE", f"parts/{self.created_data['part_id']}", 200)
        if 'vehicle_id' in self.created_data:
            self.run_test("Delete Vehicle", "DELETE", f"vehicles/{self.created_data['vehicle_id']}", 200)
        if 'client_id' in self.created_data:
            self.run_test("Delete Client", "DELETE", f"clients/{self.created_data['client_id']}", 200)

def main():
    tester = IBSAutoTester()
    
    print("🚀 Starting IBS Auto Center Backend API Testing...")
    
    try:
        # Test authentication
        if not tester.test_login():
            print("❌ Login failed, stopping tests")
            return 1

        # Test core functionality
        tester.test_client_crud()
        tester.test_vehicle_crud() 
        tester.test_service_crud()
        tester.test_part_crud()
        tester.test_quote_crud()
        tester.test_dashboard_stats()
        tester.test_settings()
        
        # Clean up
        tester.cleanup()
        
        # Print results
        success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
        print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed ({success_rate:.1f}%)")
        
        return 0 if success_rate >= 80 else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())