import router, { Router } from 'koa-joi-router';
import logger from 'logger';
import config from 'config';
import { Context } from 'koa';

import mailService from 'services/mail.service';
import SparkPost from 'sparkpost';
import { EmailTemplates } from 'types/email.type';

const formRouter: Router = router();
formRouter.prefix('/api/v1/form');

const Joi: typeof router.Joi = router.Joi;

const ALLOWED_LANGUAGES: string[] = ['en', 'es_MX', 'fr', 'id', 'pt_BR', 'zh'];
const ALLOWED_TOOLS: string[] = ['gfw', 'gfw-pro', 'fw', 'blog', 'map-builder', 'not-applicable'];
const ALLOWED_TOPICS: string[] = ['report-a-bug-or-error', 'provide-feedback', 'data-related-inquiry', 'general-inquiry'];

const contactUsValidation: Record<string, any> = {
    type: 'json',
    query: {
        loggedUser: Joi.any().optional(),
    },
    body: Joi.object({
        email: Joi.string().email().required(),
        topic: Joi.string().valid(...ALLOWED_TOPICS).default('general-inquiry').optional(),
        tool: Joi.string().valid(...ALLOWED_TOOLS).default('not-applicable').optional(),
        language: Joi.string().valid(...ALLOWED_LANGUAGES).default('en').optional(),
        message: Joi.string().required(),
    }).required()
};

const requestWebinarValidation: Record<string, any> = {
    type: 'json',
    query: {
        loggedUser: Joi.any().optional(),
    },
    body: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        request: Joi.string().required(),
    }).required()
};

class FormRouter {

    static async contactUs(ctx: Context): Promise<void> {
        logger.info('Sending mail');
        const { topic, tool } = ctx.request.body;
        const mailParams: Record<string, any> = config.get('contactEmail');
        const topicObj: Record<string, any> = mailParams.topics[topic || 'general-inquiry'];
        const toolObj: Record<string, any> = mailParams.tools[tool || 'not-applicable'];
        const mailData: Record<string, any> = {
            user_email: ctx.request.body.email,
            message: ctx.request.body.message,
            topic: topicObj.name,
            tool: toolObj.name,
            opt_in: ctx.request.body.signup,
            subject: `Contact form: ${topicObj.name} for ${toolObj.name}`
        };
        logger.debug('Mail data', mailData);

        const emails: Record<string, any> = mailParams.tools[tool];
        const wriRecipients: SparkPost.Recipient[] = emails.emailTo.split(',').map((mail: string) => ({
            address: mail
        }));

        // send mail to recipient
        logger.debug('Sending mail...');
        await mailService.sendMail(mailParams.template, mailData, wriRecipients);

        // send mail to user
        logger.debug('Getting user language...');
        const language: string = ctx.request.body.language.toLowerCase().split('_')[0];

        const template: EmailTemplates = `${mailParams.templateConfirm}-${language}` as EmailTemplates;
        logger.debug('Sending mail to user with template ', template);
        await mailService.sendMail(template, mailData, [{
            address: ctx.request.body.email
        }]);

        ctx.body = '';
    }

    static async requestWebinar(ctx: Context): Promise<void> {
        logger.info('Requesting webinar');

        const { name, email, request } = ctx.request.body;
        logger.info(`Name: ${name}, Email: ${email}, Request: ${request}`);

        const mailParams: { template: EmailTemplates, emailTo: string } = config.get('requestWebinarEmail');
        const wriRecipients: SparkPost.Recipient[] = mailParams.emailTo.split(',').map((mail: string) => ({
            address: mail
        }));

        const mailData: Record<string, any> = {
            email: ctx.request.body.email,
            name: ctx.request.body.name,
            request: ctx.request.body.request,
        };

        await mailService.sendMail(mailParams.template, mailData, wriRecipients);

        ctx.status = 204;
    }

}

// formRouter.post('/contact-us', FormRouter.contactUs);
formRouter.route({
    method: 'post',
    path: '/contact-us',
    validate: contactUsValidation,
    handler: FormRouter.contactUs,
});
formRouter.route({
    method: 'post',
    path: '/request-webinar',
    validate: requestWebinarValidation,
    handler: FormRouter.requestWebinar,
});

export default formRouter;
