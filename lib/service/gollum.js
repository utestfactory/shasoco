var service = module.exports = {};

var mods = service.mods = {
    shell: require('shelljs')
};

service.name = "gollum";
service.composeFile = "gollum.yml";
service.computes = [ "gollum" ];
service.volumes = [];
service.init = function(conf) {
    mods.shell.mkdir('-p', conf.docpath);
};
