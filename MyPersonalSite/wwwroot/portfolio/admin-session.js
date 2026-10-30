// Owner-only page: keep this browser out of optional public analytics.
try{localStorage.setItem('jp.analytics.exclude.v1','true');localStorage.removeItem('jp.analytics.visitor.v1');sessionStorage.removeItem('jp.analytics.session.v1')}catch{}
