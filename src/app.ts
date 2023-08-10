import logger from 'logger';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import koaSimpleHealthCheck from 'koa-simple-healthcheck';
import Koa from 'koa';
import koaLogger from 'koa-logger';
import koaBody from 'koa-body';
import { Server } from 'http';
import config from 'config';
import ErrorSerializer from 'serializers/error.serializer';
import { RWAPIMicroservice } from 'rw-api-microservice-node';
import * as path from 'path';
import type { File } from 'formidable';
import formRouter from 'routes/form.router';

interface IInit {
    server: Server;
    app: Koa;
}

const init: () => Promise<IInit> = async (): Promise<IInit> => {
    return new Promise((
        resolve: (value: IInit | PromiseLike<IInit>) => void
    ) => {
        const app: Koa = new Koa();
        app.use(koaSimpleHealthCheck());
        app.use(koaLogger());

        app.use(
            koaBody({
                multipart: true,
                formidable: {
                    uploadDir: '/tmp',
                    onFileBegin(name: string, file: File) {
                        const folder: string = path.dirname(file.path);
                        file.path = path.join(folder, file.name);
                    }
                }
            })
        );

        // catch errors and send in jsonapi standard. Always return vnd.api+json
        app.use(async (ctx: { status: number; response: { type: string; }; body: any; }, next: () => any) => {
            try {
                await next();
            } catch (error) {
                ctx.status = error.status || 500;

                if (ctx.status >= 500) {
                    logger.error(error);
                } else {
                    logger.info(error);
                }

                if (process.env.NODE_ENV === 'prod' && ctx.status === 500) {
                    ctx.response.type = 'application/vnd.api+json';
                    ctx.body = ErrorSerializer.serializeError(ctx.status, 'Unexpected error');
                    return;
                }

                ctx.response.type = 'application/vnd.api+json';
                ctx.body = ErrorSerializer.serializeError(ctx.status, error.message);
            }
        });

        app.use(
            RWAPIMicroservice.bootstrap({
                logger,
                gatewayURL: process.env.GATEWAY_URL,
                microserviceToken: process.env.MICROSERVICE_TOKEN,
                fastlyEnabled: process.env.FASTLY_ENABLED as | boolean | 'true' | 'false',
                fastlyServiceId: process.env.FASTLY_SERVICEID,
                fastlyAPIKey: process.env.FASTLY_APIKEY,
                requireAPIKey: process.env.REQUIRE_API_KEY as boolean | 'true' | 'false' || true,
                awsCloudWatchLoggingEnabled: process.env.AWS_CLOUD_WATCH_LOGGING_ENABLED as boolean | 'true' | 'false' || true,
                awsRegion: process.env.AWS_REGION,
                awsCloudWatchLogStreamName: config.get('service.name'),
            }),
        );

        // load routes
        app.use(formRouter.middleware());

        const port: number = parseInt(config.get('service.port'), 10);


        const server: Server = app.listen(port, () => {
            logger.info('Server started in ', process.env.PORT);
        });

        resolve({ app, server });

        logger.info(`Server started in port:${port}`);
    });
}

export { init };
