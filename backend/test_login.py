import urllib.request
import json
import urllib.error

data = json.dumps({'username': 'teacher1', 'password': 'teacher1'}).encode('utf-8')
req = urllib.request.Request('http://localhost:8000/api/auth/login/', data=data, headers={'Content-Type': 'application/json'})

try:
    res = urllib.request.urlopen(req)
    print("Success:", res.getcode())
except urllib.error.HTTPError as e:
    print("Error:", e.code, e.read().decode('utf-8'))
