import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MutualAffinityRow } from "./MutualAffinityRow";
import { CommonFollowersFacepile } from "./CommonFollowersFacepile";
export function SocialContextSection({ mutualAffinityUsers, commonFollowers }) {
    const hasAffinity = mutualAffinityUsers && mutualAffinityUsers.length > 0;
    const hasCommonFollowers = commonFollowers && commonFollowers.count > 0;
    if (!hasAffinity && !hasCommonFollowers) {
        return null;
    }
    return (_jsxs("div", { className: "w-full text-sm text-text-secondary", children: [hasCommonFollowers && (_jsx(CommonFollowersFacepile, { users: commonFollowers.users, count: commonFollowers.count })), hasAffinity && _jsx(MutualAffinityRow, { users: mutualAffinityUsers })] }));
}
