export interface mail_data {
    subject: string,
    body: string,
    greet: string,
    logo: string,
    app_name: string,
    app_background: string,
    app_color: string,
    button?: object,
}

export interface CsvRow {
    opportunity_id: string;
    name: string;
    foundation_name: string;
    provider_link?: string;
    description?: string;
  }