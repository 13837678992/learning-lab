package com.du.lease.web.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.du.lease.common.exception.LeaseException;
import com.du.lease.common.result.ResultCodeEnum;
import com.du.lease.model.entity.*;
import com.du.lease.model.enums.ItemType;
import com.du.lease.web.admin.mapper.*;
import com.du.lease.web.admin.service.*;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.du.lease.web.admin.vo.apartment.ApartmentDetailVo;
import com.du.lease.web.admin.vo.apartment.ApartmentItemVo;
import com.du.lease.web.admin.vo.apartment.ApartmentQueryVo;
import com.du.lease.web.admin.vo.apartment.ApartmentSubmitVo;
import com.du.lease.web.admin.vo.fee.FeeValueVo;
import com.du.lease.web.admin.vo.graph.GraphVo;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * @author weicheng
 * @description 针对表【apartment_info(公寓信息表)】的数据库操作Service实现
 
 */
@Service
public class ApartmentInfoServiceImpl extends ServiceImpl<ApartmentInfoMapper, ApartmentInfo>
        implements ApartmentInfoService {
    @Autowired
    private ApartmentInfoMapper apartmentInfoMapper;
    @Autowired
    private GraphInfoMapper graphInfoMapper;
    @Autowired
    private LabelInfoMapper labelInfoMapper;
    @Autowired
    private FacilityInfoMapper facilityInfoMapper;
    @Autowired
    private FeeValueMapper feeValueMapper;
    @Autowired
    private RoomInfoMapper roomInfoMapper;
    @Autowired
    private GraphInfoService graphInfoService;

    @Autowired
    private ApartmentFacilityService apartmentFacilityService;

    @Autowired
    private ApartmentLabelService apartmentLabelService;
    @Autowired
    private ApartmentFeeValueService apartmentFeeValueService;
    @Override
    public void saveOrUpdateApartment(ApartmentSubmitVo apartmentSubmitVo) {
        boolean isUpdate = apartmentSubmitVo.getId() != null;
        super.saveOrUpdate(apartmentSubmitVo);
        if (isUpdate) {
            // 1.删除图片列表
            LambdaQueryWrapper<GraphInfo> graphInfoLambdaQueryWrapper = new LambdaQueryWrapper<>();
            graphInfoLambdaQueryWrapper.eq(GraphInfo::getId, apartmentSubmitVo.getId()).eq(GraphInfo::getItemType, ItemType.APARTMENT);
            graphInfoService.remove(graphInfoLambdaQueryWrapper);
            // 2.删除配套列表
            LambdaQueryWrapper<ApartmentFacility> apartmentFacilityLambdaQueryWrapper = new LambdaQueryWrapper<>();
            apartmentFacilityLambdaQueryWrapper.eq(ApartmentFacility::getId, apartmentSubmitVo.getId());
            apartmentFacilityService.remove(apartmentFacilityLambdaQueryWrapper);
            // 3.删除标签列表
            LambdaQueryWrapper<ApartmentLabel> apartmentLabelLambdaQueryWrapper = new LambdaQueryWrapper<>();
            apartmentLabelLambdaQueryWrapper.eq(ApartmentLabel::getId, apartmentSubmitVo.getId());
            apartmentLabelService.remove(apartmentLabelLambdaQueryWrapper);
            // 4.删除杂费列表
            LambdaQueryWrapper<ApartmentFeeValue> apartmentFeeValueLambdaQueryWrapper = new LambdaQueryWrapper<>();
            apartmentFeeValueLambdaQueryWrapper.eq(ApartmentFeeValue::getApartmentId, apartmentSubmitVo.getId());
            apartmentFeeValueService.remove(apartmentFeeValueLambdaQueryWrapper);
        }
        // 1.插入图片列表
        List<GraphVo> graphVoList = apartmentSubmitVo.getGraphVoList();
        if (!CollectionUtils.isEmpty(graphVoList)) {
            ArrayList<GraphInfo> graphInfoArrayList = new ArrayList<>();
            for (GraphVo graphVo : graphVoList) {
                GraphInfo graphInfo = new GraphInfo();
                graphInfo.setName(graphVo.getName());
                graphInfo.setItemType(ItemType.APARTMENT);
                graphInfo.setItemId(apartmentSubmitVo.getId());
                graphInfo.setUrl(graphVo.getUrl());
                graphInfoArrayList.add(graphInfo);
            }
            graphInfoService.saveBatch(graphInfoArrayList);
        }

        // 2.插入配套列表
        List<Long> facilityInfoIdList = apartmentSubmitVo.getFacilityInfoIds();
        if (!CollectionUtils.isEmpty(facilityInfoIdList)) {
            ArrayList<ApartmentFacility> apartmentFacilities = new ArrayList<>();
            for (Long facilityInfoId : facilityInfoIdList) {
                ApartmentFacility apartmentFacility = new ApartmentFacility();
                apartmentFacility.setFacilityId(facilityInfoId);
                apartmentFacility.setApartmentId(apartmentSubmitVo.getId());
                apartmentFacilities.add(apartmentFacility);

            }
            apartmentFacilityService.saveBatch(apartmentFacilities);
        }

        //3.插入标签列表
        List<Long> labelIds = apartmentSubmitVo.getLabelIds();
        if (!CollectionUtils.isEmpty(labelIds)) {
            List<ApartmentLabel> apartmentLabelList = new ArrayList<>();
            for (Long labelId : labelIds) {
                ApartmentLabel apartmentLabel = new ApartmentLabel();
                apartmentLabel.setApartmentId(apartmentSubmitVo.getId());
                apartmentLabel.setLabelId(labelId);
                apartmentLabelList.add(apartmentLabel);
            }
            apartmentLabelService.saveBatch(apartmentLabelList);
        }


        //4.插入杂费列表
        List<Long> feeValueIds = apartmentSubmitVo.getFeeValueIds();
        if (!CollectionUtils.isEmpty(feeValueIds)) {
            ArrayList<ApartmentFeeValue> apartmentFeeValueList = new ArrayList<>();
            for (Long feeValueId : feeValueIds) {
                ApartmentFeeValue apartmentFeeValue = new ApartmentFeeValue();
                apartmentFeeValue.setApartmentId(apartmentSubmitVo.getId());
                apartmentFeeValue.setFeeValueId(feeValueId);
                apartmentFeeValueList.add(apartmentFeeValue);
            }
            apartmentFeeValueService.saveBatch(apartmentFeeValueList);
        }

    }

    @Override
    public IPage<ApartmentItemVo> pageItem(Page<ApartmentItemVo> objectPage, ApartmentQueryVo queryVo) {

        return apartmentInfoMapper.pageItem(objectPage,queryVo);
    }

    @Override
    public ApartmentDetailVo getDetailById(Long id) {
        // 1. 查询公寓信息
        ApartmentInfo apartmentInfo = apartmentInfoMapper.selectById(id);
        // 2. 查询图片列表
        List<GraphVo>  graphInfoList =  graphInfoMapper.selectListByItemTypeAndId(ItemType.APARTMENT,id);
        // 3. 查询标签列表
        List<LabelInfo> labelInfoList =  labelInfoMapper.selectListByApartmentId(id);
        // 4. 查询配套列表
        List<FacilityInfo> facilityInfoList =facilityInfoMapper.selectListByApartmentId(id);

        // 5. 查询杂费列表
        List<FeeValueVo> feeValueVoList =  feeValueMapper.selectListByApartmentId(id);

        // 6. 组装结果
        ApartmentDetailVo apartmentDetailVo = new ApartmentDetailVo();
        BeanUtils.copyProperties(apartmentInfo,apartmentDetailVo);
        apartmentDetailVo.setGraphVoList(graphInfoList);
        apartmentDetailVo.setLabelInfoList(labelInfoList);
        apartmentDetailVo.setFacilityInfoList(facilityInfoList);
        apartmentDetailVo.setFeeValueVoList(feeValueVoList);
        return apartmentDetailVo;
    }

    @Override
    public void removeApartmentById(Long id) throws LeaseException {
        LambdaQueryWrapper<RoomInfo> roomInfoLambdaQueryWrapper = new LambdaQueryWrapper<>();
        roomInfoLambdaQueryWrapper.eq(RoomInfo::getApartmentId, id);
        Long count = roomInfoMapper.selectCount(roomInfoLambdaQueryWrapper);
        if (count > 0) {
            throw new LeaseException(ResultCodeEnum.ADMIN_APARTMENT_DELETE_ERROR);
        }
        super.removeById(id);
        // 1.删除图片列表
        LambdaQueryWrapper<GraphInfo> graphInfoLambdaQueryWrapper = new LambdaQueryWrapper<>();
        graphInfoLambdaQueryWrapper.eq(GraphInfo::getItemId, id).eq(GraphInfo::getItemType, ItemType.APARTMENT);
        graphInfoService.remove(graphInfoLambdaQueryWrapper);
        // 2.删除配套列表
        LambdaQueryWrapper<ApartmentFacility> apartmentFacilityLambdaQueryWrapper = new LambdaQueryWrapper<>();
        apartmentFacilityLambdaQueryWrapper.eq(ApartmentFacility::getApartmentId, id);
        apartmentFacilityService.remove(apartmentFacilityLambdaQueryWrapper);
        // 3.删除标签列表
        LambdaQueryWrapper<ApartmentLabel> apartmentLabelLambdaQueryWrapper = new LambdaQueryWrapper<>();
        apartmentLabelLambdaQueryWrapper.eq(ApartmentLabel::getApartmentId, id);
        apartmentLabelService.remove(apartmentLabelLambdaQueryWrapper);
        // 4.删除杂费列表
        LambdaQueryWrapper<ApartmentFeeValue> apartmentFeeValueLambdaQueryWrapper = new LambdaQueryWrapper<>();
        apartmentFeeValueLambdaQueryWrapper.eq(ApartmentFeeValue::getApartmentId, id);
        apartmentFeeValueService.remove(apartmentFeeValueLambdaQueryWrapper);
    }
}




