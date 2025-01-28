const express = require('express');
const cors = require('cors');
const { callGenerativeAI } = require('./genai');
const app = express();
const { JSDOM } = require('jsdom');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/proxy', async (req, res) => {
  try {
    const { screenshot, html, userData } = req.body;
    
    const visionPrompt = `
      Analyze this job application form using both visual layout and HTML structure.
      SCREENSHOT CONTEXT:
      - Field positions and visual labels
      - Input types (text/radio/checkbox/dropdown)
      HTML CONTEXT:
      - Field names/IDs: ${extractFieldMetadata(html)}
      - Form structure
      USER DATA:
      ${JSON.stringify(userData)}
      Return only a JSON array sorted by visual position (top-to-bottom):
      [{
        "position": {x: %, y: %},
        "label": "detected label",
        "type": "field-type",
        "value": "matching-user-data"
      }]
      Ensure any subjective value is in first person, and generate subjective answers like bio on your own.
      If a field seems invalid, return NA as the value. Ignore fields that seem pre-filled.
    `;

    const suggestion = await callGenerativeAI({
      prompt: visionPrompt,
      image: screenshot
    });
    console.log(suggestion);
    const new_suggestion = suggestion.slice(7, suggestion.length-3);
    console.log();
    console.log(new_suggestion);
    res.json(JSON.parse(new_suggestion));
    
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

function extractFieldMetadata(html) {
    try{
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    return Array.from(doc.querySelectorAll('input, select, textarea'))
      .map(el => ({
        id: el.id,
        name: el.name,
        type: el.type,
        label: el.labels?.[0]?.textContent?.trim() || ''
      }));
    }catch (error) {
        console.error('HTML Parsing Error:', error);
        return [];
      }
  }

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));