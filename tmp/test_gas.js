const url = "https://script.google.com/macros/s/AKfycbwijq34olt6lLnpe4GmWJZELsEzQkej-SNzKZ3ZTYgJmSiz8NEiw1u7-Ysh0ek2I5Agfw/exec";

async function testPost() {
  console.log("Testing POST to GAS...");
  
  const payload = {
    api_key: "kelompok3",
    device_id: "test-node",
    ts: new Date().toISOString(),
    samples: [
      { t: new Date().toISOString(), x: 0, y: 0, z: 9.81 }
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response text:", text);
    
// ...
    const fs = require('fs');
    try {
      console.log("JSON Output:", JSON.parse(text));
    } catch {
      console.log("Failed to parse JSON, received HTML/text. Saving to err.html");
      fs.writeFileSync("err.html", text);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testPost();
