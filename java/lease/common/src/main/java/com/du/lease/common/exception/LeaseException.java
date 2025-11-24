package com.du.lease.common.exception;

import com.du.lease.common.result.ResultCodeEnum;
import lombok.Data;

@Data
public class LeaseException extends Exception{
    private Integer code;
    public LeaseException(ResultCodeEnum resultCodeEnum) {
        super(resultCodeEnum.getMessage());
        this.code = resultCodeEnum.getCode();
    }
}
