import http from 'k6/http';

export default function () {
    http.get('https://6u7mi5faqwis5avstmxmkiy43e0emvqx.lambda-url.us-west-2.on.aws/');
}
