<template>
  <div style="height: 32px">
    <h-input
      v-model="showValue"
      icon="search"
      :disabled="disabled"
      @on-click="openModals($event)"
      @on-focus="openModalIf($event)"
      :clearable="clearable"
    ></h-input>
    <!-- 选择弹窗 -->
    <h-msg-box
      :zIndex="zIndex"
      ref="detailWin"
      v-model="selectModal"
      width="800"
      :height="340"
      :title="title"
    >
      <div>
        <h-simple-tree-gird
          checkStrictly
          v-if="selectModal"
          :columns="columnsBranch"
          :data="treeTableData"
          :isCheckbox="isCheckbox"
          :highlight-row="!isCheckbox"
          :height="300"
          @on-row-click="rowClick"
          @on-select-change="selectChange"
          @on-expand="treeExpand"
        ></h-simple-tree-gird>
      </div>
      <div slot="footer">
        <h-button type="ghost" @click="selectModal = false">取消</h-button>
        <h-button type="primary" @click="submitBtn('treeRef')">确定</h-button>
      </div>
    </h-msg-box>
  </div>
</template>
<script>
export default {
  name: 'KSelectTreeBranch',
  components: {},
  data() {
    return {
      showValue: '', //显示的值 value:label
      selectModal: false,
      defaultValue: JSON.parse(localStorage.getItem('currentUser')).orgId,
      columnsBranch: [
        { title: '组织代码', key: 'branchCode' },
        { title: '组织名称', key: 'branchName' },
        //{title:'组织级别',key:'branchLevelName'},
      ],
      treeTableData: [],
      currentSelect: null, //选中的值
    }
  },
  props: {
    //父子节点不联动(只在显示多选框模式下使用)，不设置时默认联动
    checkStrictly: {
      type: Boolean,
      default: true,
    },
    //是否多选
    isCheckbox: {
      type: Boolean,
      default: false,
    },
    value: {
      //v-model绑定的值
      type: String,
      default: '',
    },
    params: {
      // 查询的参数
      type: Object,
      default: () => ({}),
    },
    url: {
      //查询的url
      type: String,
      default: '/sysBranchSet/sysBranchSetQry',
    },
    title: {
      type: String,
      default: '组织选择',
    },
    zIndex: {
      type: Number,
      default: 1001,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    clearable: {
      type: Boolean,
      default: true,
    },
    isGetVal: {
      //是否需要再次单独查询值--修改时需要
      type: Boolean,
      default: false,
    },
    queryAllSubChild: {
      //是否需要再次单独查询值--修改时需要
      type: Boolean,
      default: false,
    },
  },
  watch: {
    value(newVal, oldVal) {
      //console.log('值变化了',newVal,'显示的值：',this.showValue)
      if (this.isGetVal) {
        if (newVal == '') {
          this.showValue = ''
        } else {
          this.$api
            .sysBranchSetSysBranchSetQry({
              branchCode: newVal,
            })
            .then(res => {
              if (res.status === window.LOCAL_CONFIG.statusCode) {
                if (res.data.length == 1) {
                  this.showValue = `${res.data[0].branchCode}:${res.data[0].branchName}`
                } else if (res.data.length < 1) {
                  this.showValue = ''
                } else {
                  res.data.forEach(item => {
                    if (item.branchCode == newVal) {
                      this.showValue = `${item.branchCode}:${item.branchName}`
                    }
                  })
                }
              }
            })
        }
      } else {
        if (newVal == '') {
          this.showValue = ''
        } else {
          this.$api
            .sysBranchSetSysBranchSetQry({
              branchCode: newVal,
            })
            .then(res => {
              if (res.status === window.LOCAL_CONFIG.statusCode) {
                if (res.data.length == 0) {
                  this.showValue = ''
                } else {
                  this.showValue = `${res.data[0].branchCode}:${res.data[0].branchName}`
                }
              }
            })
        }
      }
      if (this.defaultValue) {
        this.defaultValue = ''
      }
    },
    showValue: {
      handler(newVal) {
        if (!this.isGetVal && !newVal.includes(':')) {
          this.$emit('input', newVal)
        }
      },
      immediate: true,
    },
  },
  computed: {},
  methods: {
    openModalIf(event) {
      if (this.showValue == '') {
        this.openModal()
      }
    },
    openModals(event) {
      this.openModal()
    },
    //打开弹窗
    openModal() {
      if (this.disabled) {
        return
      }
      this.selectModal = true
      this.treeTableData = []
      this.$api
        .sysBranchSetSysBranchSetQry({
          queryTransBranch: this.queryAllSubChild,
        })
        .then(res => {
          if (res.status !== window.LOCAL_CONFIG.statusCode) {
            this.$hMessage.error(res.statusMsg)
          } else {
            let data = res.data.map(v => Object.assign({}, v, { children: [], expand: false }))
            this.treeTableData = data
          }
        })
    },
    //选中确定
    submitBtn(name) {
      if (this.isCheckbox) {
        //多选
      } else {
        //单选
        this.showValue = `${this.currentSelect.branchCode}:${this.currentSelect.branchName}`
        this.$emit('input', this.currentSelect.branchCode)
        this.$emit('on-select-change', this.showValue)
      }
      this.selectModal = false
      //console.log(this.currentSelect,898989);
    },
    treeExpand(item, status) {
      // if(status){
      this.$api
        .sysBranchSetListSysBranchChildren({
          branchCode: item.branchCode,
          queryChild: true,
          queryTransBranch: true,
        })
        .then(res => {
          if (res.status === window.LOCAL_CONFIG.statusCode) {
            let data = res.data.map(v => Object.assign({}, v, { children: [] }))
            item.children = data
            item.expand = status
          }
        })
      // }
    },
    //单机事件
    rowClick(row) {
      // console.log('单击：',row)
      this.currentSelect = { ...row }
    },
    //多选选中
    selectChange(row) {
      console.log('多选选中：', row)
      this.currentSelect = [...row]
    },
  },
  created() {
    if (this.defaultValue) {
      this.$emit('input', this.defaultValue)
      this.$api
        .sysBranchSetSysBranchSetQry({
          branchCode: this.defaultValue,
        })
        .then(res => {
          if (res.status === window.LOCAL_CONFIG.statusCode) {
            if (res.data.length == 0) {
              this.showValue = ''
            } else {
              this.showValue = `${res.data[0].branchCode}:${res.data[0].branchName}`
            }
          }
        })
    }
  },
  mounted() {},
}
</script>
<style scoped lang="less"></style>
