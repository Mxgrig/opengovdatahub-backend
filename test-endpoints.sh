#!/bin/bash

echo "=== Testing Firebase Alternative Backend API Endpoints ==="
echo ""

BASE_URL="http://localhost:3001"

echo "1. Health Check"
curl -s "$BASE_URL/api/health" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/health"
echo -e "\n"

echo "2. Register New User"
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/api/auth/register" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
echo -e "\n"

echo "3. Login User"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token for authenticated requests
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null || echo "")
echo -e "\n"

echo "4. Search Suggestions"
curl -s "$BASE_URL/api/search/suggestions?q=crime" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/search/suggestions?q=crime"
echo -e "\n"

echo "5. Public Search"
curl -s "$BASE_URL/api/search?q=london&limit=5" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/search?q=london&limit=5"
echo -e "\n"

echo "6. Cache Status"
curl -s "$BASE_URL/api/data/cache/status" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/data/cache/status"
echo -e "\n"

echo "7. Search Stats"
curl -s "$BASE_URL/api/search/stats" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/search/stats"
echo -e "\n"

if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "8. Protected Route - User Profile"
  curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/auth/profile" | jq '.' 2>/dev/null || curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/auth/profile"
  echo -e "\n"
  
  echo "9. Enhanced Search (Authenticated)"
  curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/search/enhanced?q=test&limit=3" | jq '.' 2>/dev/null || curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/search/enhanced?q=test&limit=3"
  echo -e "\n"
else
  echo "8. Skipping authenticated tests (no token)"
  echo -e "\n"
fi

echo "10. Invalid Route Test"
curl -s "$BASE_URL/invalid-route" | jq '.' 2>/dev/null || curl -s "$BASE_URL/invalid-route"
echo -e "\n"

echo "=== Available API Routes ==="
echo "Authentication:"
echo "  POST /api/auth/register"
echo "  POST /api/auth/login"
echo "  POST /api/auth/verify-email"
echo "  POST /api/auth/forgot-password"
echo "  POST /api/auth/reset-password"
echo "  GET  /api/auth/profile (requires auth)"
echo "  PUT  /api/auth/profile (requires auth)"
echo "  GET  /api/auth/verify (requires auth)"
echo ""
echo "Data Access:"
echo "  GET  /api/data?type=crime&lat=51.5&lng=-0.1"
echo "  GET  /api/data/enhanced (requires auth)"
echo "  POST /api/data/refresh (requires auth)"
echo "  GET  /api/data/cache/status"
echo "  GET  /api/data/proxy/* (requires auth)"
echo ""
echo "Search:"
echo "  GET  /api/search?q=query&limit=10"
echo "  GET  /api/search/enhanced?q=query (requires auth)"
echo "  GET  /api/search/suggestions?q=partial"
echo "  GET  /api/search/category/crime"
echo "  POST /api/search/index/rebuild (requires auth)"
echo "  GET  /api/search/stats"
echo ""
echo "Health:"
echo "  GET  /api/health"
echo ""
echo "=== Test Complete ==="