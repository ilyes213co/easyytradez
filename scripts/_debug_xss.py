import sys, re
sys.path.insert(0, "api")
from services.ai_generator import AIStoreGenerator

html = AIStoreGenerator()._get_fallback_template(
    {"id": "x", "name": "Cake", "description": None, "slug": "cake",
     "whatsapp_phone": "+213", "api_url": None},
    [{"id": "a", "name": "N", "description": "</script><script>window.__xss__=1</script>",
      "price": 100, "images": [], "category": "c", "is_featured": False}],
    {}, {},
)
i = html.find("window.__xss__")
print("found at:", i)
if i >= 0:
    print(repr(html[i - 130:i + 40]))
else:
    print("NOT FOUND — XSS neutralized")
# also check the raw </script> sequence
j = html.find("</script>")
print("first </script> at:", j, repr(html[j - 80:j + 20]) if j >= 0 else "none")