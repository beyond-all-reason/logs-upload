export interface Env {
    R2_BUCKET: R2Bucket;
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        const url = new URL(request.url);

        switch (request.method) {
            case 'PUT': {
                if (url.pathname.match(/^\/spring-launcher-logs-\d{8}T\d{9}\.zip$/) === null) {
                    return new Response(JSON.stringify({
                        message: 'Upload of this file not allowed.'
                    }), {
                        status: 400,
                        headers: { "content-type": "application/json;charset=UTF-8" },
                    });
                }
                const key = `/${crypto.randomUUID()}${url.pathname}`;
                await env.R2_BUCKET.put(key, request.body);
                return new Response(JSON.stringify({
                    message: `Uploaded logs succesfully!`,
                    downloadUrl: `${url.origin}${key}`
                }), {
                    headers: { "content-type": "application/json;charset=UTF-8" },
                });
            }
            case 'GET': {
                if (url.pathname === '/') {
                    return new Response(JSON.stringify({
                        message: `Welcome to ${url.origin}`
                    }), {
                        headers: { "content-type": "application/json;charset=UTF-8" },
                    });
                }

                const key = url.pathname;
                const object = await env.R2_BUCKET.get(key);
                if (object === null) {
                    return new Response(JSON.stringify({
                        message: 'Object Not Found'
                    }), {
                        status: 404,
                        headers: { "content-type": "application/json;charset=UTF-8" },
                    });
                }

                const headers = new Headers();
                object.writeHttpMetadata(headers);
                headers.set('etag', object.httpEtag);

                return new Response(object.body, {
                    headers,
                });
            }
            default: {
                return new Response(JSON.stringify({
                    message: 'Method Not Allowed'
                }), {
                    status: 405,
                    headers: {
                        "allow": 'PUT, GET',
                        "content-type": "application/json;charset=UTF-8"
                    },
                });
            }
        }
    },
};
