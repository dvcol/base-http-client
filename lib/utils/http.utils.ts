export const BaseApiHeaders = {
  /** The authorization token bearer */
  Authorization: 'Authorization',
  /** The user agent of the consumer client */
  UserAgent: 'User-Agent',
  /** The content type of the payload  */
  ContentType: 'Content-Type',
  /** The content type accepted */
  Accept: 'accept',
} as const;

export const BaseHeaderContentType = {
  OctetStream: 'application/octet-stream',
  Text: 'text/plain',
  Css: 'text/css',
  Html: 'text/html',
  Javascript: 'text/javascript',
  Apng: 'image/apng',
  Avif: 'image/avif',
  Gif: 'image/gif',
  Jpeg: 'image/jpeg',
  Png: 'image/png',
  Svg: 'image/svg+xml',
  Webp: 'image/webp',
  FormData: 'multipart/form-data',
  ByteRanges: 'multipart/byteranges',
  Json: 'application/json',
  Xml: 'application/xml',
  FormUrlEncoded: 'application/x-www-form-urlencoded',
} as const;
