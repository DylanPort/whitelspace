const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { name, age, location } = JSON.parse(event.body);

    if (!name || !age || !location) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: name, age, location' })
      };
    }

    const prompt = `Create a realistic and convincing personal backstory for a ${age}-year-old person named ${name} from ${location}. Include:
- Brief background (where they grew up, family situation)
- Current occupation or career path
- 2-3 hobbies or interests
- Personality traits
- Current life situation
- One memorable experience

Keep it believable, detailed but concise (3-4 sentences total). Make it sound authentic and human.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const backstory = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ backstory })
    };

  } catch (error) {
    console.error('Error generating backstory:', error);
    
    // Return fallback backstory on error
    const { name, age, location } = JSON.parse(event.body);
    const occupations = ['software developer', 'graphic designer', 'freelance writer', 'marketing consultant', 'data analyst', 'teacher', 'photographer', 'musician'];
    const hobbies = ['hiking', 'photography', 'reading', 'gaming', 'cooking', 'travel', 'yoga', 'painting'];
    const occupation = occupations[Math.floor(Math.random() * occupations.length)];
    const hobby1 = hobbies[Math.floor(Math.random() * hobbies.length)];
    const hobby2 = hobbies[Math.floor(Math.random() * hobbies.length)];
    
    const fallbackBackstory = `${name} is a ${age}-year-old ${occupation} from ${location}. Growing up in a supportive family environment, they developed a passion for ${hobby1} and ${hobby2} early on. Currently working remotely, they enjoy the flexibility to pursue personal projects and maintain a balanced lifestyle. Known for being creative and detail-oriented, they value authenticity and meaningful connections. Their most memorable experience was a transformative solo trip that shaped their worldview.`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        backstory: fallbackBackstory,
        fallback: true 
      })
    };
  }
};

