import mockData from './mockdata.json';
import { STORAGE_KEYS, ANTHROPIC_API_URL, ANTHROPIC_VERSION, OPENAI_API_URL, GOOGLE_API_BASE_URL } from './constants';

export interface Model {
  id: string;
  name: string;
}

export interface Provider {
  id: string;
  name: string;
  models: Model[];
}

// Fetch providers and models from mock data
export const getProviders = (): Provider[] => {
  return mockData.providers;
};

// sessionStorage helpers
export const saveKey = (key: string) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEYS.MODEL_API_KEY, key);
  }
};

export const getKey = (): string | null => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(STORAGE_KEYS.MODEL_API_KEY);
  }
  return null;
};

export const clearKey = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEYS.MODEL_API_KEY);
  }
};

// Request logic
export async function callModel(apiKey: string, providerId: string, modelId: string, messages: any[]) {
  if (providerId === 'anthropic') {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 1024,
        messages
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    return response.json();
  } else if (providerId === 'openai') {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 1024,
        messages
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      content: [{ text: data.choices?.[0]?.message?.content || '' }]
    };
  } else if (providerId === 'google') {
    // Map standard messages [{role: 'user', content: '...'}] to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(`${GOOGLE_API_BASE_URL}/${modelId}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      content: [{ text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' }]
    };
  } else {
    throw new Error(`Integration for provider '${providerId}' is not implemented yet.`);
  }
}
