import { UserProfile } from "../types/models";

export const DEFAULT_RESTRICTED_GROUPS = [
  "18+",
  "Adult",
  "Erotic",
  "Mature",
  "NSFW",
  "XXX",
];

export function createDefaultProfiles(): UserProfile[] {
  return [
    {
      blockedGroups: [],
      id: "profile-owner",
      name: "Owner",
      pin: "",
    },
    {
      blockedGroups: DEFAULT_RESTRICTED_GROUPS,
      id: "profile-family",
      name: "Family",
      pin: "2468",
    },
    {
      blockedGroups: DEFAULT_RESTRICTED_GROUPS,
      id: "profile-kids",
      name: "Kids",
      pin: "1234",
    },
  ];
}
