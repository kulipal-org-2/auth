declare module 'smile-identity-core' {
  export interface PartnerParams {
    job_id: string;
    user_id: string;
    job_type: number;
  }

  export interface IdInfo {
    country?: string;
    id_type?: string;
    id_number?: string;
    entered?: string;
    business_type?: string;
    first_name?: string;
    last_name?: string;
    dob?: string;
    business_name?: string;
    [key: string]: string | undefined;
  }

  export interface SmileJobResponse {
    ResultCode: string;
    ResultText: string;
    SmileJobID: string;
    timestamp: string;
    signature: string;
    job_complete?: boolean;
    job_success?: boolean;
    code?: string;
    result?: SmileResultData;
    company_information?: Record<string, unknown>;
    directors?: unknown[];
    beneficial_owners?: unknown[];
    [key: string]: unknown;
  }

  export interface SmileResultData {
    ResultCode?: string;
    ResultText?: string;
    SmileJobID?: string;
    FullName?: string;
    IDNumber?: string;
    DOB?: string;
    Gender?: string;
    Photo?: string;
    Actions?: Record<string, string>;
    [key: string]: unknown;
  }

  export interface WebApiOptions {
    return_job_status?: boolean;
    return_image_links?: boolean;
    return_history?: boolean;
  }

  export interface WebTokenParams {
    user_id: string;
    job_id: string;
    product?: string;
    callback_url?: string;
  }

  export class IDApi {
    constructor(partnerId: string, apiKey: string, sidServer: string);
    submit_job(
      partnerParams: PartnerParams,
      idInfo: IdInfo,
    ): Promise<SmileJobResponse>;
  }

  export class WebApi {
    constructor(
      partnerId: string,
      callbackUrl: string,
      apiKey: string,
      sidServer: string,
    );
    submit_job(
      partnerParams: PartnerParams,
      imageDetails: Array<{ image_type_id: number; image: string }>,
      idInfo?: IdInfo,
      options?: WebApiOptions,
    ): Promise<SmileJobResponse>;
    get_web_token(params: WebTokenParams): Promise<string>;
  }

  export class Signature {
    constructor(partnerId: string, apiKey: string);
    generate_signature(timestamp?: string): {
      signature: string;
      timestamp: string;
    };
    confirm_signature(timestamp: string, signature: string): boolean;
  }

  export class Utilities {
    constructor(partnerId: string, apiKey: string, sidServer: string);
    get_job_status(
      userId: string,
      jobId: string,
      options?: WebApiOptions,
    ): Promise<SmileJobResponse>;
  }
}
