export type Mail = {
  FromName: string;
  MessageStream: string;
  From: string;
  FromFull: Full;
  To: string;
  ToFull: Full[];
  Cc: string;
  CcFull: Full[];
  Bcc: string;
  BccFull: Full[];
  OriginalRecipient: string;
  Subject: string;
  MessageID: string;
  ReplyTo: string;
  MailboxHash: string;
  Date: string;
  TextBody: string;
  HtmlBody: string;
  StrippedTextReply: string;
  Tag: string;
  Headers: Header[];
  Attachments: any[];
};

export type Full = {
  Email: string;
  Name: string;
  MailboxHash: string;
};

export type Header = {
  Name: string;
  Value: string;
};
