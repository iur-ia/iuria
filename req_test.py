import requests
import urllib3
urllib3.disable_warnings()
print(requests.get("https://api.tinyfish.io", verify=False).status_code)
