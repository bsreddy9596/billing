const Setting = require("../models/Setting");

class SettingsService {
    async getSettings() {
        let settings = await Setting.findOne().lean();
        if (!settings) {
            settings = await Setting.create({});
        }
        return settings;
    }

    async updateSettings(data, userId) {
        let settings = await Setting.findOne();

        if (!settings) {
            settings = await Setting.create({
                ...data,
                updatedBy: userId,
            });
        } else {
            Object.assign(settings, data);
            settings.updatedBy = userId;
            await settings.save();
        }

        return settings;
    }

    async resetSettings(userId) {
        await Setting.deleteMany({});
        const defaults = await Setting.create({});
        return defaults;
    }
}

module.exports = new SettingsService();
