declare module 'smile-identity-core' {
  export interface PartnerParams {
    job_id: string;
    user_id: string;
    job_type: number;
  }

  export interface IdInfo {
    country: string;
    id_type: string;
    id_number: string;
    entered?: string;
    business_type?: string;
    first_name?: string;
    last_name?: string;
    dob?: string;
    business_name?: string;
  }

  export interface SmileJobResponse {
    ResultCode: string;
    ResultText: string;
    SmileJobID: string;
    timestamp: string;
    signature: string;
    [key: string]: unknown;
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
      idInfo: IdInfo,
      options?: Record<string, unknown>,
    ): Promise<SmileJobResponse>;
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
      partnerId: string,
      jobId: string,
      userId: string,
    ): Promise<SmileJobResponse>;
  }
}
