export interface GreenApiCredentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export interface InstanceSettings {
  typeInstance?: string;
  incomingWebhook?: string;
  outgoingWebhook?: string;
  outgoingMessageWebhook?: string;
  outgoingAPIMessageWebhook?: string;
  webhookUrl?: string;
}

export interface Notification {
  receiptId: number;
  body: unknown;
}
