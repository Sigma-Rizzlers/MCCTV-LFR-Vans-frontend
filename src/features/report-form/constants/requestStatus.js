export const requestStatusLabelMap = {
  pending: "កំពុងរង់ចាំ",
  approved: "អនុម័តរួច",
  rejected: "មិនអនុម័ត"
};

export const requestStatusList = Object.keys(requestStatusLabelMap);

export function getRequestStatus(value) {
  return requestStatusLabelMap[value] ? value : "pending";
}

export function summarizeRequestStatuses(reports = []) {
  return reports.reduce(
    (result, report) => {
      const status = getRequestStatus(report?.approvalStatus);
      result.total += 1;
      result[status] += 1;
      return result;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0 }
  );
}
