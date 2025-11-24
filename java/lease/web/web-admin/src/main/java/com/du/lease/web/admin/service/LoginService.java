package com.du.lease.web.admin.service;

import com.du.lease.web.admin.vo.login.CaptchaVo;
import com.du.lease.web.admin.vo.login.LoginVo;
import com.du.lease.web.admin.vo.system.user.SystemUserInfoVo;

public interface LoginService {

    CaptchaVo getCaptcha();

    String login(LoginVo loginVo) throws Exception;

    SystemUserInfoVo getLoginUserInfo(Long userId);
}
