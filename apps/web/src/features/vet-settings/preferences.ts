export interface VetNotificationPreferences {
  email: {
    newAppointment: boolean;
    appointmentCancelled: boolean;
    customerRating: boolean;
    weeklyDigest: boolean;
  };
  inApp: {
    newAppointment: boolean;
    scheduleChange: boolean;
    badgeEarned: boolean;
  };
}

export const defaultVetNotificationPreferences: VetNotificationPreferences = {
  email: {
    newAppointment: true,
    appointmentCancelled: true,
    customerRating: false,
    weeklyDigest: true,
  },
  inApp: {
    newAppointment: true,
    scheduleChange: true,
    badgeEarned: true,
  },
};
