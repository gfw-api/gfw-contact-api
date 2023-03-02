import config from 'config';
import logger from 'logger';
import { createClient, RedisClientType } from 'redis';
import { EmailTemplates } from 'types/email.type';
import SparkPost from 'sparkpost';

const CHANNEL:string = config.get('apiGateway.queueName');

class MailService {

    redisClient: RedisClientType
    #isConnected: boolean = false

    constructor() {
        logger.debug('[MailService] Initializing mail queue');

        this.redisClient = createClient({
            url: config.get('apiGateway.queueUrl')
        });
    }

    async #connect(): Promise<boolean> {
        if (!this.#isConnected) {
            await this.redisClient.connect();
            this.#isConnected = true;
        }
        return true;
    }

    async sendMail(template: EmailTemplates, data: Record<string, any>, recipients: SparkPost.Recipient[], sender: string = 'gfw'): Promise<number> {
        // this.asynClient.emit(JSON.stringify({
        //     template,
        //     data,
        //     recipients
        // }));

        const message: string = JSON.stringify({
            template,
            data,
            recipients,
            sender
        })
        logger.debug('[sendMail] - Sending mail with data', message);

        await this.#connect();

        return this.redisClient.publish(CHANNEL, message);

    }

}

export default new MailService();
