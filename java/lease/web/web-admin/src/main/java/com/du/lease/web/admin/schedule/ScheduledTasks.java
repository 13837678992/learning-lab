package com.du.lease.web.admin.schedule;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.du.lease.model.entity.LeaseAgreement;
import com.du.lease.model.enums.LeaseStatus;
import com.du.lease.web.admin.service.LeaseAgreementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.Date;

public class ScheduledTasks {
    @Autowired
    private LeaseAgreementService leaseAgreementService;
    @Scheduled(cron = "0 0 0 * * *")
    public void checkLeaseStatus() {

        LambdaUpdateWrapper<LeaseAgreement> updateWrapper = new LambdaUpdateWrapper<>();
        Date now = new Date();
        updateWrapper.le(LeaseAgreement::getLeaseEndDate, now);
        updateWrapper.set(LeaseAgreement::getStatus, LeaseStatus.EXPIRED);
        updateWrapper.in(LeaseAgreement::getStatus, LeaseStatus.SIGNED, LeaseStatus.WITHDRAWING);

        leaseAgreementService.update(updateWrapper);
    }
}
