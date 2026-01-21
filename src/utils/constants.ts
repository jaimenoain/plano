export const USER_BUILDING_STATUS = {
  PENDING: 'pending',
  VISITED: 'visited',
} as const;

export type UserBuildingStatus = typeof USER_BUILDING_STATUS[keyof typeof USER_BUILDING_STATUS];
