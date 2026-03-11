const ActivityLog = require("../models/ActivityLog");
const mongoose = require("mongoose");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

class ActivityService {
    async listActivities(query) {
        const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
        const limit = Math.min(Number(query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
        const skip = (page - 1) * limit;

        const { user, action, q, from, to } = query;
        const filter = {};

        if (user && mongoose.Types.ObjectId.isValid(user)) filter.userId = user;
        if (action) filter.action = action;
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }
        if (q) {
            const regex = new RegExp(q, "i");
            filter.$or = [{ message: regex }, { "meta.detail": regex }];
        }

        const [total, data] = await Promise.all([
            ActivityLog.countDocuments(filter),
            ActivityLog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        return {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            data,
        };
    }

    async getActivityById(id) {
        return ActivityLog.findById(id).lean();
    }

    async deleteActivity(id) {
        return ActivityLog.findByIdAndDelete(id);
    }
}

module.exports = new ActivityService();
