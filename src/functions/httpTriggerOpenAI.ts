import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { callOpenAI } from './openAI';

export async function httpTriggerOpenAI(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // systemPrompt: string, userPrompt: string, temperature = 0, useBYOD = false
    const body = await request.formData();
    const systemPrompt: string = body.get('systemPrompt') as string || '';
    const userPrompt: string = body.get('userPrompt') as string || '';
    const temperature: number = Number(body.get('temperature')) ?? 0;
    const useBYOD: boolean = body.get('useBYOD') === 'true';
    context.log(systemPrompt, userPrompt, temperature, useBYOD);

    try {
        const response = await callOpenAI(systemPrompt, userPrompt, temperature, useBYOD);
        return { body: response };
    }
    catch (error: any) {
        context.log(error.message);
        return {
            status: 500,
            body: error.message
        };
    }
};

app.http('httpTriggerOpenAI', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: httpTriggerOpenAI
});
