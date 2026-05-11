import re

file = 'test_router.py'
with open(file, 'r') as f:
    code = f.read()

# Retira TinyFish do teste e deixa bater normal pra gente ver a extração
# O DNS do TinyFish está inativo ou incorreto na URL que foi dada ("api.tinyfish.io").
code = code.replace('os.environ["TINYFISH_URL"] = "https://api.tinyfish.io/v1/proxy"', '# os.environ')
code = code.replace('os.environ["TINYFISH_KEY"] = "sk-tinyfish-No9AxKzALquT44ZdeDze7nLzE4ieOt1q"', '# os.environ')

with open(file, 'w') as f:
    f.write(code)
