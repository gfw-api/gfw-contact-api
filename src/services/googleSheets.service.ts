import config from 'config';
import {
    GoogleSpreadsheet,
    GoogleSpreadsheetCell, GoogleSpreadsheetRow,
    GoogleSpreadsheetWorksheet
} from 'google-spreadsheet';
import logger from 'logger';

const CONTACT_US_SHEET_INDEX: number = 1;
const REQUEST_WEBINAR_SHEET_TITLE: string = 'Webinar Requests';

class GoogleSheetsService {
    creds: Record<string, any>;
    doc: any;

    constructor() {
        this.creds = config.get('googleSheets');
        this.doc = new GoogleSpreadsheet(this.creds.target_sheet_id);
    }

    async authSheets(): Promise<void> {
        return this.doc.useServiceAccountAuth({
            private_key: this.creds.private_key.replace(/\\n/g, '\n'),
            client_email: this.creds.client_email,
        });
    }

    async updateSheet(user: Record<string, any>): Promise<GoogleSpreadsheetRow | any> {
        try {
            await this.authSheets();

            // Load cells
            await this.doc.loadInfo();
            const sheet: GoogleSpreadsheetWorksheet = await this.doc.sheetsByIndex[CONTACT_US_SHEET_INDEX];
            await sheet.loadCells();

            for (let i: number = 0; i < sheet.rowCount; i++) {
                const cell: GoogleSpreadsheetCell = await sheet.getCell(i, 5);
                if (cell.value === user.email) {
                    logger.info('User already exists. Updating....');
                    return this.updateCells(cell, user);
                }
            }

            if (user.signup === 'true') {
                logger.info('User does not exist. Adding....');
                const newRow: Record<string, any> = {
                    agreed_to_test: 'yes',
                    'Date First Added': this.getDate(),
                    Email: user.email,
                    Source: 'GFW Feedback Form'
                };

                return sheet.addRow(newRow);
            }
        } catch (err) {
            logger.error(err);
        }
    }

    async updateCells(row: Record<string, any>, user: Record<string, any>): Promise<GoogleSpreadsheetRow[] | any> {
        try {
            logger.info('Getting user....');
            const sheet: GoogleSpreadsheetWorksheet = await this.doc.sheetsByIndex[CONTACT_US_SHEET_INDEX];
            const rows: GoogleSpreadsheetRow[] = await sheet.getRows({ offset: row.row - 1, limit: 1 });
            logger.info('Found user....');
            rows[0].source = 'GFW Feedback form';
            rows[0].agreedtotest = user.signup === 'true' ? 'yes' : 'no';
            await rows[0].save();
            logger.info('User updated');
            return rows;
        } catch (err) {
            logger.error(err);
        }
    }

    getDate(): string {
        const today: Date = new Date();
        let dd: number | string = today.getDate();
        let mm: number | string = today.getMonth() + 1; // January is 0!

        const yyyy: number = today.getFullYear();
        if (dd < 10) {
            dd = `0${dd}`;
        }
        if (mm < 10) {
            mm = `0${mm}`;
        }
        return `${mm}/${dd}/${yyyy}`;
    }

    async requestWebinar(data: Record<string, any>): Promise<GoogleSpreadsheetRow> {
        try {
            // Auth using promises
            await this.authSheets();
            logger.info('[GoogleSheetsService] Adding a new webinar request...');

            await this.doc.loadInfo();
            const sheet: GoogleSpreadsheetWorksheet = this.doc.sheetsByTitle[REQUEST_WEBINAR_SHEET_TITLE];
            const rowResult: GoogleSpreadsheetRow = await sheet.addRow(data);
            logger.info('[GoogleSheetsService] Added new webinar request.');

            return rowResult;
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

}

export default new GoogleSheetsService();
