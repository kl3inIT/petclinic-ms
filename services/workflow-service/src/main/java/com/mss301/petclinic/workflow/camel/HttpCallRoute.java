package com.mss301.petclinic.workflow.camel;

import org.apache.camel.Exchange;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;

/**
 * Camel route cho {@link com.mss301.petclinic.workflow.delegate.CamelHttpCallDelegate} —
 * gọi HTTP động tới bất kỳ microservice nào (URL từ BPMN field injection).
 */
@Component
public class HttpCallRoute extends RouteBuilder {

    public static final String ROUTE_URI = "direct:petclinic-http-call";

    @Override
    public void configure() {
        from(ROUTE_URI)
                .routeId("petclinic-http-call")
                .removeHeaders("*")
                .setHeader(Exchange.HTTP_METHOD, exchangeProperty("httpMethod"))
                .setHeader(Exchange.CONTENT_TYPE, exchangeProperty("contentType"))
                .toD("${exchangeProperty.targetUrl}");
    }
}
