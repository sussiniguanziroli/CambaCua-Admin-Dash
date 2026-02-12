const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export const processInvoiceImage = async (imageFile) => {
  try {
    const base64Image = await fileToBase64(imageFile);
    
    const requestBody = {
      contents: [{
        parts: [
          {
            text: `Eres un experto en data entry y procesamiento de facturas veterinarias. Analiza esta imagen y extrae la información en formato JSON estricto.

Estructura requerida:
{
  "proveedor": "nombre del proveedor o null",
  "fecha": "YYYY-MM-DD o null",
  "items": [
    {
      "descripcion": "nombre del producto tal cual aparece",
      "cantidad": numero (integer),
      "precio_unitario": numero (float),
      "subtotal": numero (float)
    }
  ],
  "total": numero (float)
}

Reglas:
1. Extrae TODOS los ítems visibles.
2. Solo devuelve el JSON, sin bloques de código markdown, sin explicaciones.
3. Si hay símbolos de moneda, ignóralos y extrae solo el valor numérico.`
          },
          {
            inline_data: {
              mime_type: imageFile.type,
              data: base64Image
            }
          }
        ]
      }]
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error en la API de Gemini');
    }

    const data = await response.json();
    let textResponse = data.candidates[0].content.parts[0].text;
    
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('La respuesta no contiene un JSON válido');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      data: extractedData
    };

  } catch (error) {
    console.error('Error procesando factura:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};