package models

// 代理配置数据结构
type ProxyConfig struct {
	ConfigPath string      `json:"configPath"`
	ProxyRules []ProxyRule `json:"proxyRules"`
}

type ProxyAddress struct {
	URL      string `json:"url"`
	Comment  string `json:"comment"`
	IsActive bool   `json:"isActive"`
}

type ProxyRule struct {
	Title          string         `json:"title"` // 规则标题（如 # 端口80的API代理）
	Port           string         `json:"port"`  // 监听端口（如 80）
	Location       string         `json:"location"`
	ProxyAddresses []ProxyAddress `json:"proxyAddresses"`
	ActiveIndex    int            `json:"activeIndex"`
	Description    string         `json:"description"`
	Enabled        bool           `json:"enabled"`
}

// 获取当前激活的代理地址
func (r *ProxyRule) GetActiveProxyPass() string {
	if len(r.ProxyAddresses) == 0 {
		return ""
	}
	if r.ActiveIndex >= len(r.ProxyAddresses) {
		r.ActiveIndex = 0
	}
	return r.ProxyAddresses[r.ActiveIndex].URL
}

// 获取所有代理地址（包括注释的）
func (r *ProxyRule) GetAllProxyAddresses() []ProxyAddress {
	return r.ProxyAddresses
}
