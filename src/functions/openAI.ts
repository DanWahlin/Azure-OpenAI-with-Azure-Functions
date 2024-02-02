import { OpenAI } from 'openai';
import { OpenAIHeadersBody, ChatGPTData } from './interfaces';
import fetch from 'cross-fetch';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT as string;
const OPENAI_MODEL = process.env.OPENAI_MODEL as string;
const OPENAI_API_VERSION = process.env.OPENAI_API_VERSION as string;
const AZURE_COGNITIVE_SEARCH_ENDPOINT = process.env.AZURE_COGNITIVE_SEARCH_ENDPOINT as string;
const AZURE_COGNITIVE_SEARCH_KEY = process.env.AZURE_COGNITIVE_SEARCH_KEY as string;
const AZURE_COGNITIVE_SEARCH_INDEX = process.env.AZURE_COGNITIVE_SEARCH_INDEX as string;

async function getAzureOpenAICompletion(systemPrompt: string, userPrompt: string, temperature: number): Promise<string> {
    checkRequiredEnvVars(['OPENAI_API_KEY', 'OPENAI_ENDPOINT', 'OPENAI_MODEL']);

    const fetchUrl = `${OPENAI_ENDPOINT}/openai/deployments/${OPENAI_MODEL}/chat/completions?api-version=${OPENAI_API_VERSION}`;

    const messageData: ChatGPTData = {
        max_tokens: 1024,
        temperature,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]
    };

    const headersBody: OpenAIHeadersBody = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': OPENAI_API_KEY
        },
        body: JSON.stringify(messageData),
    };

    const completion = await fetchAndParse(fetchUrl, headersBody);
    console.log(completion);

    let content = (completion.choices[0]?.message?.content?.trim() ?? '') as string;
    console.log('Azure OpenAI Output: \n', content);

    if (content && content.includes('{') && content.includes('}')) {
        content = extractJson(content);
    }

    console.log('After parse: \n', content);

    return content;
}

async function getAzureOpenAIBYODCompletion(systemPrompt: string, userPrompt: string, temperature: number): Promise<string> {
    checkRequiredEnvVars([ 
        'OPENAI_API_KEY',
        'OPENAI_ENDPOINT',
        'OPENAI_MODEL',
        'AZURE_COGNITIVE_SEARCH_ENDPOINT',
        'AZURE_COGNITIVE_SEARCH_KEY',
        'AZURE_COGNITIVE_SEARCH_INDEX',
    ]);

    const fetchUrl = `${OPENAI_ENDPOINT}/openai/deployments/${OPENAI_MODEL}/extensions/chat/completions?api-version=${OPENAI_API_VERSION}`;

    const messageData: ChatGPTData = {
        max_tokens: 1024,
        temperature,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        dataSources: [
            {
                type: 'AzureCognitiveSearch',
                parameters: {
                    endpoint: AZURE_COGNITIVE_SEARCH_ENDPOINT,
                    key: AZURE_COGNITIVE_SEARCH_KEY,
                    indexName: AZURE_COGNITIVE_SEARCH_INDEX
                }
            }
        ]
    };

    const headersBody: OpenAIHeadersBody = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': OPENAI_API_KEY,
            chatgpt_url: fetchUrl.replace('extensions/', ''),
            chatgpt_key: OPENAI_API_KEY
        },
        body: JSON.stringify(messageData),
    };

    const completion = await fetchAndParse(fetchUrl, headersBody);
    console.log(completion);

    if (completion.error) {
        console.error('Azure OpenAI BYOD Error: \n', completion.error);
        return completion.error.message;
    }

    const citations = (completion.choices[0]?.messages[0]?.content?.trim() ?? '') as string;
    console.log('Azure OpenAI BYOD Citations: \n', citations);

    let content = (completion.choices[0]?.messages[1]?.content?.trim() ?? '') as string;
    console.log('Azure OpenAI BYOD Output: \n', content);

    return content;
}

async function getOpenAICompletion(systemPrompt: string, userPrompt: string, temperature = 0): Promise<string> {
    await checkRequiredEnvVars(['OPENAI_API_KEY']);

    try {
        // v4+ OpenAI API. 
        // On v3? View the migration guide here: https://github.com/openai/openai-node/discussions/217
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // gpt-3.5-turbo, gpt-4
            max_tokens: 1024,
            temperature,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        });

        let content = completion.choices[0]?.message?.content?.trim() ?? '';
        console.log('OpenAI Output: \n', content);
        if (content && content.includes('{') && content.includes('}')) {
            content = extractJson(content);
        }
        return content;
    }
    catch (e) {
        console.error('Error getting data:', e);
        throw e;
    }
}

function checkRequiredEnvVars(requiredEnvVars: string[]) {
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing ${envVar} in environment variables.`);
        }
    }
}

async function fetchAndParse(url: string, headersBody: Record<string, any>): Promise<any> {
    try {
        const response = await fetch(url, headersBody);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        throw error;
    }
}

function callOpenAI(systemPrompt: string, userPrompt: string, temperature = 0, useBYOD = false) {
    const isAzureOpenAI = OPENAI_API_KEY && OPENAI_ENDPOINT && OPENAI_MODEL;

    if (isAzureOpenAI && useBYOD) {
        // Azure OpenAI + Cognitive Search: Bring Your Own Data
        return getAzureOpenAIBYODCompletion(systemPrompt, userPrompt, temperature);
    }

    if (isAzureOpenAI) {
        // Azure OpenAI
        return getAzureOpenAICompletion(systemPrompt, userPrompt, temperature);
    }

    // OpenAI
    return getOpenAICompletion(systemPrompt, userPrompt, temperature);
}

function extractJson(content: string) {
    const regex = /\{(?:[^{}]|{[^{}]*})*\}/g;
    const match = content.match(regex);

    if (match) {
        // If we get back pure text it can have invalid carriage returns
        return match[0].replace(/"([^"]*)"/g, (match) => match.replace(/\n/g, "\\n"));
    } else {
        return '';
    }
}

export { callOpenAI };