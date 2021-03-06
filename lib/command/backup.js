var cmd = module.exports = {};

var mods = cmd.mods = {
    deploys: require('../deploys'),
    services: require('../services'),
    backup: require('../backup'),
    package: require('../../package.json'),
    utils: require('../utils')
};

// We consider lodash as part of the language, no need to mock.
var _ = require('lodash');

cmd.register = function(program) {
    return program.command('backup <deploy-id> <backup-id>', 'save a backup to disk')
};

cmd.registerFull = function(program) {
    return program.arguments('<deploy-id> <backup-id>');
};

cmd.action = function(options, cb) {

    var id = options.args[0];
    if (!id)
        return mods.utils.error(cb, "<deploy-id> missing");

    var backupID = options.args[1] || mods.backup.generateID();

    var conf = mods.deploys.safeLoad(id);
    if (!conf)
        return mods.utils.error(cb, "can't load config file");

    if (conf.status === 'UP')
        return mods.utils.error(cb, "can't backup if deploy is " + conf.status);

    var backupConf = mods.backup.conf(conf, backupID);

    if (conf.version !== mods.package.version)
        return mods.utils.error(cb, "Domain isn't using the same version as the tool, use `shasoco version` to fix that");

    var tmpPath = backupConf.backupPath;
    var run = mods.backup.run;
    var finalPath = mods.deploys.path(conf.id) + "/backups";
    var finalTar = finalPath + "/" + backupID + ".tar.gz";

    // Backup the project config
    run(id, "mkdir -p " + tmpPath);
    run(id, "cp " + mods.deploys.path(conf.id) + "/config.yml " + tmpPath);

    // Backup service into their own subdirectory
    mods.utils.callForAll(mods.services, 'backup', backupConf);
 
    // Retrieve volumes
    var volumes = [];
    mods.services.forEach(function(s) {
        if (s.volumes) {
            s.volumes.forEach(function(c) {
                volumes.push({
                    service: s.name,
                    container: c.split(":")[0],
                    volume: c.split(":")[1]
                });
            });
        }
    });

    // Backup each
    volumes.forEach(function(vol) {
        mods.backup.backupVolume(backupConf, vol.service, vol);
    });

    // Create the final archive
    run(id, "mkdir -p " + finalPath);
    run(id, "rm -f " + finalTar);
    run(id, "sh -c 'cd " + tmpPath + "; tar -czf " + finalTar + " .'");
    run(id, "rm -rf " + tmpPath);
};

