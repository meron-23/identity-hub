import urllib.request
import json
import tarfile
import os
import shutil

url = "https://pypi.org/pypi/insightface/0.7.3/json"
data = json.loads(urllib.request.urlopen(url).read())
sdist_url = [item['url'] for item in data['urls'] if item['packagetype'] == 'sdist'][0]

print("Downloading:", sdist_url)
urllib.request.urlretrieve(sdist_url, "insightface.tar.gz")

print("Extracting...")
with tarfile.open("insightface.tar.gz", "r:gz") as tar:
    tar.extractall()

# Move the python module into ai/models
src = "insightface-0.7.3/insightface"
dst = "ai/models/insightface"
if os.path.exists(dst):
    shutil.rmtree(dst)
shutil.copytree(src, dst)

print("Done installing insightface python files locally.")
