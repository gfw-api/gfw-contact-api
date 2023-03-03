import Router from 'koa-router';
import logger from 'logger';
import config from 'config';
import { Context } from 'koa';

import mailService from 'services/mail.service';
import googleSheetsService from 'services/googleSheets.service';
import SparkPost from 'sparkpost';
import { EmailTemplates } from 'types/email.type';


const router: Router = new Router({
    prefix: '/api/v1/form'
});

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
        let language: string = 'en';
        if (ctx.request.body.language) {
            language = ctx.request.body.language.toLowerCase().replace('_', '-');
        }

        const template: EmailTemplates = `${mailParams.templateConfirm}-${language}` as EmailTemplates;
        logger.debug('Sending mail to user with template ', template);
        await mailService.sendMail(mailParams.templateConfirm, mailData, [{
            address: ctx.request.body.email
        }]);

        // Update Google SpreadSheet for beta users
        try {
            await googleSheetsService.updateSheet(ctx.request.body);
        } catch (err) {
            logger.error(err);
        }

        ctx.body = '';
    }

    static async requestWebinar(ctx: Context): Promise<void> {
        logger.info('Requesting webinar');

        const { name, email, request } = ctx.request.body;
        logger.info(`Name: ${name}, Email: ${email}, Request: ${request}`);

        const validateEmail = (str: string): boolean => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(str);
        const sendValidationError = (message: string, code: string, status: number = 400): void => {
            ctx.status = status;
            ctx.body = { errors: [{ detail: message, code }] };
        };

        if (!name) {
            sendValidationError('Name is required', 'NAME_REQUIRED');
            return;
        }
        if (!email) {
            sendValidationError('Email is required', 'EMAIL_REQUIRED');
            return;
        }
        if (!validateEmail(email)) {
            sendValidationError('Email is invalid', 'EMAIL_INVALID');
            return;
        }

        try {
            await googleSheetsService.requestWebinar({ name, email, request });
            ctx.status = 204;
        } catch (err) {
            logger.error(err);
            ctx.status = 500;
        }
    }

}

router.post('/contact-us', FormRouter.contactUs);
router.post('/request-webinar', FormRouter.requestWebinar);

export default router;
