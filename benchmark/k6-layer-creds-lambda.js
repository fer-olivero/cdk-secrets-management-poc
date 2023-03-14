import http from 'k6/http';

export default function () {
    http.get('https://23dixkonvccivkxparhzmdchaq0qiriz.lambda-url.us-west-2.on.aws/');
}