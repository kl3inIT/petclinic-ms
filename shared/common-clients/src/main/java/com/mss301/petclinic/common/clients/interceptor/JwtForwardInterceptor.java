package com.mss301.petclinic.common.clients.interceptor;

import java.io.IOException;

import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Forward Bearer JWT của caller request sang downstream service call.
 *
 * <p>Defense-in-depth: downstream vẫn validate JWT độc lập qua common-security.
 * Interceptor này chỉ chuyển tiếp token — không tự generate token mới (sẽ phá role/sub).
 *
 * <p>Nếu request hiện tại không có JWT (vd: gọi từ scheduled task), interceptor không
 * add header — downstream nhận 401, đúng behavior.
 */
public class JwtForwardInterceptor implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                        ClientHttpRequestExecution execution) throws IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            String token = jwtAuth.getToken().getTokenValue();
            request.getHeaders().setBearerAuth(token);
        }
        return execution.execute(request, body);
    }
}
