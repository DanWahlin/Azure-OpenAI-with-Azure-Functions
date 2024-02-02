export interface AzureOpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    choices: [{
        role: string;
        message: {
            content: string;
        }
    }],
    finish_reason: string;
    index: number;
    error?: AzureOpenAIError;
};

export interface AzureOpenAIError {
    code: string;
    message: string;
}

export interface ChatGPTData {
    max_tokens: number,
    temperature: number,
    dataSources?: CognitiveSearchDataSource[],
    messages: ChatGPTMessage[]
}

export interface CognitiveSearchDataSource {
    type: string,
    parameters: {
        endpoint: string,
        key: string,
        indexName: string
    }
}

export interface ChatGPTMessage {
    role: string;
    content: string;
}

export interface OpenAIHeadersBody {
    method: string,
    headers: {
        'Content-Type': string;
        'api-key': string;
        chatgpt_url?: string;
        chatgpt_key?: string;
    },
    body: string;
}