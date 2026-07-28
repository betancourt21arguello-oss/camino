const model = "gemini-1.5-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=INVALID_KEY`;

fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    contents: [{ parts: [{ text: "Hola" }] }]
  })
}).then(res => console.log(res.status)).catch(err => console.error(err));
