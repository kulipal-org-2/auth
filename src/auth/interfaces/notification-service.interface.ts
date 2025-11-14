import type { Observable } from 'rxjs';

export interface NotificationGrpcService {
  Email(data: {
    template: string;
    subject: string;
    email: string;
    data: Record<string, string>;
  }): Observable<any>;
  Sms(data: {
    phoneNumber: string;
    message: string;
    senderId?: string;
    channel?: string;
  }): Observable<any>;
}
