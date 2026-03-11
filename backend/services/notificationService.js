const Notification = require("../models/Notification");
const mongoose = require("mongoose");

class NotificationService {
    async getNotifications(userId, userRole) {
        const filter = {
            $or: [{ toUser: userId }, { toRole: userRole }],
        };

        return Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
    }

    async markAsRead(notificationId, userId, userRole) {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return { error: "Invalid ID", status: 400 };
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, $or: [{ toUser: userId }, { toRole: userRole }] },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return { error: "Notification not found", status: 404 };
        }

        return notification;
    }

    async markAllAsRead(userId, userRole) {
        await Notification.updateMany(
            {
                $or: [{ toUser: userId }, { toRole: userRole }],
                read: false,
            },
            { read: true }
        );
        return true;
    }

    async deleteNotification(notificationId, userId, userRole) {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return { error: "Invalid ID", status: 400 };
        }

        const result = await Notification.findOneAndDelete({
            _id: notificationId,
            $or: [{ toUser: userId }, { toRole: userRole }],
        });

        if (!result) {
            return { error: "Notification not found", status: 404 };
        }

        return true;
    }

    async clearAll(userId, userRole) {
        await Notification.deleteMany({
            $or: [{ toUser: userId }, { toRole: userRole }],
        });
        return true;
    }
}

module.exports = new NotificationService();
