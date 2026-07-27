import request from '@/utils/request';

export function getData() {
  return request({
    url: '/demo/data',
    method: 'get'
  });
}
