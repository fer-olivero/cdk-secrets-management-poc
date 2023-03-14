import http from 'k6/http';

export default function () {
    http.get('https://vfwbfyytbk43yws5xx7rvsmyxm0efztf.lambda-url.us-west-2.on.aws/');
}