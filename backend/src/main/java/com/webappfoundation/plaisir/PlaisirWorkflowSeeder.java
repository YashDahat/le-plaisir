package com.webappfoundation.plaisir;

import com.webappfoundation.connector.builtin.EmailConnector;
import com.webappfoundation.connector.demo.DemoRefundConnector;
import com.webappfoundation.dto.WorkflowDto;
import com.webappfoundation.dto.WorkflowDto.BindingDto;
import com.webappfoundation.dto.WorkflowDto.StageDto;
import com.webappfoundation.model.RefundPolicy;
import com.webappfoundation.service.WorkflowService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

/** Defines the three Le Plaisir workflows: pickup, table, gathering. Idempotent (defineWorkflow no-ops if the code exists). */
@Component
@Order(10)
public class PlaisirWorkflowSeeder {

    public static final String PICKUP = "pickup";
    public static final String TABLE = "table";
    public static final String GATHERING = "gathering";

    private final WorkflowService workflowService;

    public PlaisirWorkflowSeeder(WorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        workflowService.defineWorkflow(WorkflowDto.builder()
                .code(PICKUP).label("Counter pickup").staffRole("Counter").isDefault(true)
                .stages(List.of(
                        stage("PLACED", "Order sent", b -> b.initial(true).cancellable(true).refundPolicy(RefundPolicy.FULL).targetMinutes(5)),
                        stage("CONFIRMED", "Kitchen has it", b -> b.onPaidEntry(true).cancellable(true).refundPolicy(RefundPolicy.FULL).targetMinutes(10)
                                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER), email(EmailConnector.EMAIL_STORE)))),
                        stage("PREPARING", "Being plated / boxed", b -> b.cancellable(true).refundPolicy(RefundPolicy.PARTIAL).refundPercent(50).targetMinutes(20)),
                        stage("READY", "Waiting at the counter", b -> b.refundPolicy(RefundPolicy.NONE).targetMinutes(30)
                                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER)))),
                        stage("COLLECTED", "Collected. Enjoy!", b -> b.terminal(true).refundPolicy(RefundPolicy.NONE)
                                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER)))),
                        cancelled())).build());

        workflowService.defineWorkflow(WorkflowDto.builder()
                .code(TABLE).label("Table booking").staffRole("Host")
                .stages(List.of(
                        stage("RECEIVED", "Received", b -> b.initial(true).cancellable(true).refundPolicy(RefundPolicy.FULL).targetMinutes(5)),
                        stage("WITH_HOST", "With our host", b -> b.onPaidEntry(true).cancellable(true).refundPolicy(RefundPolicy.FULL).targetMinutes(15)
                                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER), email(EmailConnector.EMAIL_STORE)))),
                        stage("CONFIRMED", "Table confirmed", b -> b.cancellable(true).refundPolicy(RefundPolicy.FULL)
                                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER)))),
                        stage("SEATED", "Seated. Bon appetit", b -> b.refundPolicy(RefundPolicy.NONE).targetMinutes(120)),
                        stage("COMPLETED", "Completed", b -> b.terminal(true).refundPolicy(RefundPolicy.NONE)
                                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER)))),
                        stage("NO_SHOW", "No-show", b -> b.terminal(true).refundPolicy(RefundPolicy.NONE)),
                        cancelled())).build());

        workflowService.defineWorkflow(WorkflowDto.builder()
                .code(GATHERING).label("Team lunches & large tables").staffRole("Events desk")
                .stages(List.of(
                        stage("RECEIVED", "Received", b -> b.initial(true).cancellable(true).refundPolicy(RefundPolicy.FULL).targetMinutes(5)),
                        stage("REVIEWING", "We are planning it", b -> b.onPaidEntry(true).cancellable(true).refundPolicy(RefundPolicy.FULL).targetMinutes(120)
                                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER), email(EmailConnector.EMAIL_STORE)))),
                        stage("QUOTED", "Menu & quote shared", b -> b.cancellable(true).refundPolicy(RefundPolicy.FULL).targetMinutes(1440)
                                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER)))),
                        stage("CONFIRMED", "Confirmed", b -> b.cancellable(true).refundPolicy(RefundPolicy.FULL)
                                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER)))),
                        stage("FULFILLED", "Done", b -> b.terminal(true).refundPolicy(RefundPolicy.NONE)
                                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER)))),
                        cancelled())).build());
    }

    private static StageDto cancelled() {
        return stage("CANCELLED", "Cancelled", b -> b.terminal(true).refundPolicy(RefundPolicy.NONE)
                .bindings(List.of(email(EmailConnector.EMAIL_CUSTOMER), binding(DemoRefundConnector.ID, DemoRefundConnector.REFUND_ISSUE))));
    }

    private static BindingDto email(String action) {
        return binding(EmailConnector.ID, action);
    }

    private static BindingDto binding(String connectorId, String actionCode) {
        return BindingDto.builder().connectorId(connectorId).actionCode(actionCode).enabled(true).build();
    }

    private static StageDto stage(String code, String label, Consumer<StageDto.StageDtoBuilder> cfg) {
        StageDto.StageDtoBuilder b = StageDto.builder().code(code).label(label).refundPolicy(RefundPolicy.NONE).bindings(new ArrayList<>());
        cfg.accept(b);
        return b.build();
    }
}
